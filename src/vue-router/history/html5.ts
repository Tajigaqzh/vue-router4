export interface RouteState {
    back: string | null,
    current: string,
    forward: string | null,
    replace: boolean,
    scroll: {
        left: number,
        top: number
    } | null,
    position: number
}

export interface CurrentLocation {
    value: string
}

export interface HistoryState {
    value: RouteState
}

export interface HistoryStateNavigation {
    location: CurrentLocation,
    state: HistoryState,
    push: (to: string, data: RouteState | null) => void,
    replace: (to: string, data: RouteState | null) => void
}

export interface HistoryListeners {
    listen: (cb: Function) => void
}

export type RouterHistory = HistoryListeners & HistoryStateNavigation

/**
 * 构建状态
 * @param back
 * @param current
 * @param forward
 * @param replace
 * @param computedScroll
 */
function buildState(back: string | null, current: string, forward: string | null, replace = false, computedScroll = false): RouteState {
    return {
        back,
        current,
        forward,
        replace,
        scroll: computedScroll ? {left: window.pageXOffset, top: window.pageYOffset} : null,
        position: window.history.length - 1
    } as RouteState
}

/**
 * 创建当前路径
 * @param base
 */
function createCurrentLocation(base: string): string {
    const {pathname, search, hash} = window.location;

    const hasPos = base.indexOf('#'); // 就是hash  / /about ->  #/ #/about
    if (hasPos > -1) {
        return base.slice(1) || '/';
    }
    return pathname + search + hash
}


/**
 * 获取当前路径和当前状态，以及导航跳转
 * @param base
 */
function useHistoryStateNavigation(base: string): HistoryStateNavigation {
    /**
     * 当前的location路径
     */
    const currentLocation: CurrentLocation = {
        value: createCurrentLocation(base)
    }
    /**
     * 浏览器状态
     */
    const historyState: HistoryState = {
        value: window.history.state
    }
    // 第一次刷新页面 此时没有任何状态，那么我就自己维护一个状态 （后退后是哪个路径、当前路径是哪个、要去哪里，我是用的push跳转还是replace跳转，跳转后滚动条位置是哪）
    if (!historyState.value) {
        changeLocation(currentLocation.value, buildState(null, currentLocation.value, null, true), true)
    }

    /**
     * 改变history的state，第一次的时候是替换
     * @param to
     * @param state
     * @param replace
     */
    function changeLocation(to: string, state: RouteState, replace: boolean) {
        const hasPos = base.indexOf('#');
        const url = hasPos > -1 ? base + to : to;
        window.history[replace ? 'replaceState' : 'pushState'](state, null as any, url);
        historyState.value = state; // 将自己生成的状态同步到了路由系统中了
    }

    function push(to: string, data: RouteState) { // 去哪，带的新的状态是谁？
        // 跳转的时候 我需要做两个状态 一个是跳转前 从哪去哪 
        const currentState = Object.assign({},
            historyState.value, // 当前的状态
            {forward: to, scroll: {left: window.pageXOffset, top: window.pageYOffset}}
        ) as RouteState;
        // 把当前的状态的forward设置为to

        // 这一次本质是没有跳转的 只是更新了状态，后续在vue中我可以详细监控到状态的变化
        changeLocation(currentState.current, currentState, true)

        // 新状态
        const state = Object.assign({},
            buildState(currentLocation.value, to, null), {position: currentState.position + 1},
            data
        ) as RouteState

        changeLocation(to, state, false); // 真正的更改路径
        currentLocation.value = to;
        // 跳转后 更新当前的location
    }

    function replace(to: string, data: RouteState): void {
        // 先创建一个状态
        const state = Object.assign({},
            // 前一个，当前，后一个
            buildState(historyState.value.back, to, historyState.value.forward, true),
            data
        )
        // 替换路径
        changeLocation(to, state, true);
        currentLocation.value = to; // 替换后需要将路径变为现在的路径
    }

    return {
        location: currentLocation,
        state: historyState,
        push,
        replace
    } as HistoryStateNavigation
}


/**
 * 前进后退的时候 要更新historyState 和 currentLocation这两个变量
 * @param base
 * @param historyState
 * @param currentLocation
 */
function useHistoryListeners(base: string, historyState: HistoryState, currentLocation: CurrentLocation): HistoryListeners {
    let listeners: Function[] = []
    const popStateHandler = (options: PopStateEvent) => { // 最新的状态，已经前进后退完毕后的状态
        const {state} = options;
        const to = createCurrentLocation(base); // 去哪
        const from = currentLocation.value; // 从哪来
        const fromState = historyState.value; // 从哪来的状态

        currentLocation.value = to;//更改currentLocation为去哪
        historyState.value = state; // state 可能会为null
        //根据当前状态和fromState判断是前进还是后退
        let isBack = state.position - fromState.position < 0

        // 用户在这扩展.....
        listeners.forEach(listener => {
            listener(to, from, {isBack})
        })
    }

    // window.addEventListener("popstate", ({state}: PopStateEvent) => {
    //
    // })
    //@see https://html.spec.whatwg.org/multipage/nav-history-apis.html#popstateevent
    // popstate 事件只会在浏览器某些行为下触发，比如点击后退按钮（或者在 JavaScript 中调用 history.back() 方法）。
    // 即，在同一文档的两个历史记录条目之间导航会触发该事件。
    window.addEventListener('popstate', popStateHandler); // 只能监听浏览器的前进后退
    /**
     * 监听路由变化
     * @param cb
     */
    function listen(cb: Function) {
        listeners.push(cb);
    }

    return {
        listen
    }
}

/**
 * 创建web路由
 * @param base
 */
export function createWebHistory(base = ''): RouterHistory {

    // 1.路由系统最基本的 得包含当前的路径，当前路径下他的状态是什么, 需要提供两个切换路径的方法 push replace
    // 实现路由监听，路由变化通知用户
    const historyNavigation = useHistoryStateNavigation(base);

    const historyListeners = useHistoryListeners(base, historyNavigation.state, historyNavigation.location);

    const routerHistory = Object.assign({}, historyNavigation, historyListeners)

    /**
     * 代理一下，简化取值
     */
    Object.defineProperty(routerHistory, 'location', { // 代理模式
        get: () => historyNavigation.location.value
    })
    Object.defineProperty(routerHistory, 'state', {
        get: () => historyNavigation.state.value
    })
    return routerHistory
}
