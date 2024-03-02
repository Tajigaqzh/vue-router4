import {RouteRecord, RouteRecordRaw} from "./index.ts";


/**
 * 格式化用户配置的路由规则
 * @param record
 */
function normalizeRouteRecord(record: RouteRecordRaw): RouteRecord {
    return {
        path: record.path,//状态机，算出匹配规则
        name: record.name,
        beforeEnter: record.beforeEnter,
        components: {
            default: record.component
        },
        meta: record.meta || {},
        children: record.children || []
    } as RouteRecord
}

/**
 *
 * @param record
 * @param parent
 */
function createRouteRecordMatcher(record: RouteRecord, parent: RouteRecord | null): Matcher {
    // record中的path，做一些正则的修改
    const matcher: Matcher = {
        path: record.path,
        record,
        parent: parent || null,
        children: []
    };

    if (parent) {
        parent.children.push(matcher as unknown as RouteRecord)
    }
    return matcher;
}

export interface Matcher {
    path: string,
    record: RouteRecord,
    parent: RouteRecord | null,
    children: Matcher[],
}

/**
 * 根据用户配置的路由规则遍历，创建路由匹配器
 * @param routes
 */

export function createRouterMatcher(routes: RouteRecordRaw[]) {
    const matchers: Matcher[] = [];



    // debugger
    // 第一次的时候，父亲为null
    routes.forEach((route: RouteRecordRaw) => addRoute(route));


    /**
     * 动态添加路由
     * @param route
     * @param parent
     */
    function addRoute(route: RouteRecordRaw, parent?: RouteRecordRaw) {
        // 格式化用户配置的路由规则
        let normalizedRecord = normalizeRouteRecord(route);

        /**
         * 如果有父亲，就把父亲的路径加到自己身上
         */
        if (parent) {
            if (normalizedRecord.path.startsWith("/")){
                normalizedRecord.path = parent.path + normalizedRecord.path
            }else {
                normalizedRecord.path = (parent.path + "/" + normalizedRecord.path).replace("//","/")
            }
            console.log('parent', parent.path, normalizedRecord.path)
        }

        const matcher: Matcher = createRouteRecordMatcher(normalizedRecord, parent as unknown as RouteRecord);

        if ('children' in normalizedRecord) {
            const children = normalizedRecord.children;
            for (let i = 0; i < children.length; i++) {
                addRoute(children[i], matcher as unknown as RouteRecordRaw);
            }

        }
        matchers.push(matcher)
    }

    /**
     * 解析路由，找到匹配的路由和父路由
     * @param location
     */
    function resolve(location: { path: string }) {
        const matched:RouteRecord[] = []
        let path = location.path;
        let matcher = matchers.find(m => m.path == path);
        while (matcher) {
            matched.unshift(matcher.record)//将用户的原始数据放到matched中
            matcher = matcher.parent as unknown as Matcher;
        }
        return {
            path,
            matched
        }

    }

    return {
        resolve,
        addRoute // 动态的添加路由， 面试问路由 如何动态添加 就是这个api
    }


}
