import {createWebHashHistory} from "./history/hash";
import {createWebHistory, RouterHistory} from "./history/html5";
import {App, Component, computed, DefineComponent, inject, reactive, shallowRef, unref} from "vue";

import {createRouterMatcher} from "./matcher.ts";

import {HpRouterLink} from "./RouterLink.ts";
import {HpRouterView} from "./RouterView.ts";

export declare type RouteComponent = Component | DefineComponent;

declare type Lazy<T> = () => Promise<T>;

declare type RawRouteComponent = RouteComponent | Lazy<RouteComponent>;


// export interface ResolvedItem {
//     path: string,
//     matched: RouteRecord[]
// }

/**
 * 用户传入的路由表
 */
export interface RouteRecordRaw {
    path: string,
    component: RawRouteComponent,
    name?: string | undefined,
    components?: any,
    children?: RouteRecordRaw[],
    beforeEnter?: (to: string, from: string, next: Function) => void,
    meta?: object;
}

/**
 * 拍平的路由，包括父子关系
 */
export interface RouteRecord extends RouteRecordRaw {
    path: string,
    meta?: object,
    name?: string | undefined,
    components: {
        default: RawRouteComponent
    },
    beforeEnter?: (to: string, from: string, next: Function) => void,
    children: RouteRecordRaw[]
}

/**
 * 当前path对应的路由记录
 */
export interface StateLocation {
    path: string,
    params?: object,
    query?: object,
    matched: RouteRecord[]
}

/**
 * 初始化路由系统中的默认参数
 */
const STATE_LOCATION_NORMALIZED: StateLocation = {
    path: '/',
    params: {},//路径参数
    query: {},
    matched: [],//当前路径匹配的记录
}

export type ReactiveRoute = StateLocation

export interface Router {
    push: (to: string) => void,
    beforeEach: (fn: (to: string, form: string, next: Function) => void) => void,
    afterEach: (fn: (to: string, form: string, next: Function) => void) => void,
    beforeResolve: (fn: (to: string, form: string, next: Function) => void) => void,

    install(app: App): void,
}


interface UseCallback {
    add: (fn: Function) => void;
    list: () => Function[]
}

function useCallback(): UseCallback {
    const handlers: Function[] = [];

    function add(handler: Function) {
        handlers.push(handler);
    }


    return {
        add,
        list: () => handlers
    }
}


export interface RouterOptions {
    routes: RouteRecordRaw[],
    history: RouterHistory,
    // scrollBehavior?: RouterScrollBehavior;
}

/**
 * a => {path: '/a', component: A,parent:Home}
 * b => {path: '/b', component: B,parent:Home}
 * 创建router
 * @param options
 */
function createRouter(options: RouterOptions): Router {
    const routerHistory = options.history;
    const matcher = createRouterMatcher(options.routes); // 格式化路由的配置 拍平

    // 用shallowRef，不跟踪深层对象
    const currentRoute = shallowRef(STATE_LOCATION_NORMALIZED);

    /**
     * 路由守卫
     */
    const beforeGuards = useCallback();

    /**
     * 路由守卫
     */
    const beforeResolveGuards = useCallback()

    /**
     * 路由守卫
     */
    const afterGuards = useCallback()


    /**
     * 匹配 to对应的record
     * {path: string, matched: RouteRecord[]
     * @param to
     */
    function resolve(to: string): StateLocation {
        return matcher.resolve({path: to})
    }

    // 用来标记是否已经渲染
    let ready = false;

    /**
     * 用来标记第一次渲染，并监听前进后退事件
     */
    function markAsReady() {
        if (ready) return;
        ready = true;// 用来标记已经渲染完毕了
        routerHistory.listen((to: string) => {
            const targetLocation: StateLocation = resolve(to);
            const from = currentRoute.value;
            finalizeNavigation(targetLocation, from, true)//切换前进后退的时候使用replace模式，不是push模式
        })
    }

    /**
     * 根据是不是第一次决定是push，还是replace，如果是初始化，还需要注入listen，监听用户操作的前进后退事件，更新currentRoute
     * 数据变化后可以重新渲染
     * @param to
     * @param from
     * @param replace
     */
    function finalizeNavigation(to: StateLocation, from: StateLocation, replace: boolean) {
        // 第一次
        if (from === STATE_LOCATION_NORMALIZED || replace) {
            routerHistory.replace(to.path, null)
        } else {
            routerHistory.push(to.path, null)
        }
        currentRoute.value = to;//更新最新的路径
        markAsReady()
    }

    /**
     * 记录哪些是离开，哪些是更新，哪些是进入
     * @param to
     * @param from
     */
    function extractChangeRecords(to: StateLocation, from: StateLocation): RouteRecord[][] {
        const leavingRecords: RouteRecord[] = [];
        const updatingRecords: RouteRecord[] = [];
        const enteringRecords: RouteRecord[] = [];
        const len = Math.max(to.matched.length, from.matched.length);

        for (let i = 0; i < len; i++) {
            const recordFrom = from.matched[i];
            if (recordFrom) { // /a   [home,A]  /b [home,B]
                // 去的和来的都有 那么就是要更新
                if (to.matched.find(record => record.path == recordFrom.path)) {
                    // RouteRecord
                    updatingRecords.push(recordFrom);
                } else {
                    // 去的有，来的没有，那么就是要离开
                    leavingRecords.push(recordFrom)
                }
            }
            const recordTo = to.matched[i]
            if (recordTo) {
                // 来的里面不包含去的，那么就是要进入
                if (!from.matched.find(record => record.path === recordTo.path)) {
                    enteringRecords.push(recordTo)
                }
            }
        }
        return [leavingRecords, updatingRecords, enteringRecords]

    }

    /**
     * 导航的时候要知道哪个组件是进入，哪个组件是离开的，还要知道哪个组件上更新的
     * @param to
     * @param from
     */
    async function navigate(to: StateLocation, from: StateLocation) {
        const [leavingRecords, updatingRecords, enteringRecords] = extractChangeRecords(to, from);

        // 我离开的时候 需要从后往前   /home/a  -> about
        let guards = extractComponentsGuards(
            leavingRecords.reverse(),
            "beforeRouteLeave",
            to,
            from);

        return runGuardQueue(guards).then(() => {
            guards = [];
            for (const guard of beforeGuards.list()) {
                // todo-这里也有问题
                guards.push(guardToPromiseFn(guard, to, from, to.matched[0]))
            }
            return runGuardQueue(guards);
        }).then(() => {
            guards = extractComponentsGuards(
                updatingRecords,
                'beforeRouteUpdate',
                to,
                from
            )
            return runGuardQueue(guards)
        }).then(() => {
            guards = [];
            for (const record of to.matched) {
                if (record.beforeEnter) {
                    guards.push(guardToPromiseFn(record.beforeEnter, to, from, record))
                }
            }
            return runGuardQueue(guards)
        }).then(() => {
            guards = extractComponentsGuards(
                enteringRecords,
                'beforeRouteEnter',
                to,
                from
            )
            return runGuardQueue(guards)
        }).then(() => {
            guards = []
            for (const guard of beforeResolveGuards.list()) {
                // todo - 这里有bug
                guards.push(guardToPromiseFn(guard, to, from, to.matched[0]))
            }
            return runGuardQueue(guards)
        })

    }

    /**
     * 通过路径匹配到记录，更新currentRoute
     * 还有许多其他需要考虑的，比如激活的样式，路径，参数
     * 路由钩子
     * @param to
     */
    function pushWithRedirect(to: string) {
        const targetLocation = resolve(to)
        const from = currentRoute.value

        /**
         * 导航之前调钩子
         */
        navigate(targetLocation, from).then(() => {
            //根据是不是第一次决定是push还是replace
            return finalizeNavigation(targetLocation, from, false);
        }).then(() => {
            // 切换完之后的钩子afterEach
            for (const guard of afterGuards.list()) {
                guard(to, from)
            }
        })
        // 跳转前可以做路由的拦截，调用钩子

    }


    /**
     * 处理跳转和重定向，没带参数
     * @param to
     */
    function push(to: string) {
        return pushWithRedirect(to)
    }

    const router = {
        push,
        beforeEach: beforeGuards.add,//可以注册钩子，发布订阅模式
        afterEach: afterGuards.add,
        beforeResolve: beforeResolveGuards.add,
        install(app: App) {
            const router = this
            //@ts-ignore
            app.config.globalProperties.$router = router
            // 从$route上取值的时候要保持响应式
            Object.defineProperty(app.config.globalProperties, '$route', {
                enumerable: true,
                get: () => unref(currentRoute)
            })
            // reactiveRoute就是$route，做成计算属性
            const reactiveRoute: ReactiveRoute = {
                path: "",
                params: undefined,
                matched: [],
                query: undefined
            }

            for (let key in STATE_LOCATION_NORMALIZED) {
                // @ts-ignore
                reactiveRoute[key] = computed(() => currentRoute.value[key])
                // 给每个属性包裹一层computed，支持解构
            }

            // app.config.globalProperties.$route = currentRoute.value
            // 路由的核心就是 页面切换 ，重新渲染
            app.provide('router', router); // 暴露路由对象

            // let resa:UnwrapNestedRefs<StateLocation> = reactive<StateLocation>(reactiveRoute)
            // 用reactive再包裹一层，取值的时候不用.value
            app.provide('route location', reactive<ReactiveRoute>(reactiveRoute)); // 用于实现useRoute，useRouter

            app.component("RouterLink", HpRouterLink);
            app.component("RouterView", HpRouterView);

            // 安装的时候要跳转一下
            if (currentRoute.value == STATE_LOCATION_NORMALIZED) {

                push(routerHistory.location as unknown as string)
                // 默认就是初始化, 需要通过路由系统先进行一次跳转 发生匹配
                // push(routerHistory.location as unknown as string)
            }
            // 后续还有逻辑
            // 解析路径 ， RouterLink RouterView 实现， 页面的钩子 从离开到进入 到解析完成
        },
    } as Router;
    return router;
}

/**
 * 给钩子函数包裹一层promise
 * @param guard
 * @param to
 * @param from
 * @param record
 */
function guardToPromiseFn(guard: Function, to: StateLocation, from: StateLocation, record: RouteRecord) {
    return () => {
        return new Promise((resolve, _reject) => {
            // 如果用户调用了next，那么就会执行resolve
            const next = () => resolve(null)
            const guardReturn = guard.call(record, to, from, next);
            // 如果不调用next，函数执行完了最终也会自动调用
            Promise.resolve(guardReturn).then(next)
        })
    }
}

function extractComponentsGuards(records: RouteRecord[], guardType: string, to: StateLocation, from: StateLocation) {

    const guards: Function[] = [];

    for (const record of records) {
        let rawComponent = record.components.default as any;
        const guard = rawComponent[guardType];
        guard && guards.push(guardToPromiseFn(guard, to, from, record))
    }

    return guards
}

export function useRouter() {
    return inject('router')
}

export function useRoute() {
    return inject("route location")
}

/**
 * promise组合
 * @param guards
 */
function runGuardQueue(guards: Function[]) {
    return guards.reduce((promise, guard) => {
        return promise.then(() => guard())
    }, Promise.resolve())
}

export function beforeRouteEnter(fn: (to: string, from: string, next: Function) => void) {
    return fn
}

export function onBeforeRouteLeave(fn: (to: string, from: string, next: Function) => void) {
    return fn
}

export function onBeforeRouteUpdate(fn: (to: string, from: string, next: Function) => void) {
    return fn
}

export {createWebHashHistory, createWebHistory, createRouter};

