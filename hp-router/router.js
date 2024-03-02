/**
 * 创建一个状态
 * @param back
 * @param current
 * @param forward
 * @param replace
 * @param computedScroll
 */
function buildState(back, current, forward, replace = false, computedScroll = false) {
    return {
        back,
        current,
        forward,
        replace,
        scroll: computedScroll ? {left: window.pageXOffset, top: window.pageYOffset} : null,
        position: window.history.length - 1
    }
}

/**
 * 获取当前的location
 * @returns
 */
function createCurrentLocation(base) {
    const {pathname, search, hash} = window.location
    const hasPos = base.indexOf('#');
    if (hasPos>-1){
        return base.slice(1) ||'/';
    }

    return pathname + search + hash
}

/**
 * history模式
 */
function useHistoryStateNavigation(base) {
    const currentLocation = {
        value: createCurrentLocation(base),
    }
    /**
     * history状态
     */
    const historyState = {
        value: window.history.state,

    }
    //第一次进入页面时，historyState.value为null，此时需要维护一个自己的状态，
    // 包括后退的路径，当前路径，要去哪里，用的是replace还是push
    //跳转后的滚动条
    if (!historyState.value) {
        // 创建一个状态
        const state = buildState(null, currentLocation.value, null, true)
        // 初始化的时候跳转一次，并把状态存到history中
        changeLocation(currentLocation.value, state, true)
    }

    /**
     * 去那，带的状态
     * 跳转的时候要错两个状态，一个是跳转前，从哪去哪
     * 跳转后从这到哪里
     *
     * // 这里changeLocation跳转两次的目的是为了更新状态，第一次是替换模式，并没有更新路径，只是更新了状态
     * @param {*} to
     * @param {*} data
     */
    function push(to, data) {
        //合并一个老的状态，修改了forward，scroll
        const currentState = Object.assign(
            {},
            historyState.value,
            {
                forward: to,
                scroll: {
                    left: window.pageXOffset,
                    top: window.pageYOffset
                }
            }
        )
        //本质是没有跳转的，只是修改了状态，可以使用vue的watch监听，状态变化后跳转
        changeLocation(currentState.current, currentState, true)

        //新的状态

        const state = Object.assign({},
            buildState(currentState.value, to, null, false),
            {
                position: currentState.position + 1
            },
            data
        )
        // 发生跳转
        changeLocation(to, state, false)//真正的更改路径

        currentLocation.value = to;

    }

    function replace(to, data) {
        /**
         * 合并一个状态
         * @type {any}
         */
        const state = Object.assign({}, buildState(historyState.value.back, to, historyState.value.forward, true), data)

        changeLocation(to, state, true)
        currentLocation.value = to;//替换后需要将李静变为现在的路径

    }


    /**
     * 改变window的history
     * @param {*} to
     * @param {*} state
     * @param {*} replace
     * pushState()是在history栈中添加一个新的条目，replaceState()是替换当前的记录值。
     * 用pushState的时候会产生一条新的history，replaceState则不会产生
     */
    function changeLocation(to, state, replace) {
        const hasPos = base.indexOf('#') > -1;
        const url = hasPos ? base + to : to;
        window.history[replace ? 'replaceState' : 'pushState'](state, null, url)
        historyState.value = state;//将自己生成的状态同步到路由系统中
    }

    return {
        location: currentLocation,
        state: historyState,
        push,
        replace,
    }

}

/**
 * 监听popstate事件,当用户点击浏览器的前进后退按钮时，会触发popstate事件
 * @param {*} historyState
 * @param {*} currentLocation
 * 前进后退的时候要更新historyState和currentLocation
 */
function useHistoryListeners(historyState, currentLocation) {
    const listeners = [];
    const popStateHandler = ({state}) => {
        const to = createCurrentLocation();
        const from = currentLocation.value;//去哪
        const fromState = historyState.value;//从哪来

        currentLocation.value = to;
        historyState.value = state;//state可能为空

        // 当前状态和之前的状态相减，知道是前进还是后退
        let isBack = state.position - fromState.position < 0;

        /**
         * 每次变化都会触发用户传递的监听
         */
        listeners.forEach(listener => {
          listener(to, from, { isBack });
        })

        // 通过回调暴露出去，让外部可以监听
    }
    window.addEventListener('popstate', popStateHandler);
    function listen(callback) {
        listeners.push(callback)
    }

    return {listen};
}

/**
 * 创建路由模式，默认是history模式
 */
export function createWebHistory(base = '') {
    const historyNavigation = useHistoryStateNavigation(base);
    // 还需要监听popstate事件，当用户点击浏览器的前进后退按钮时，会触发popstate事件
    const historyListeners = useHistoryListeners(historyNavigation.state, historyNavigation.location)

    // 合并一下，方便取值，不合并的话取值要history.location.value
    const routerHistory = Object.assign({}, historyNavigation, historyListeners)

    Object.defineProperty(routerHistory, 'location', {
        get: () => historyNavigation.location.value
    })

    Object.defineProperty(routerHistory, 'state', {
        get: () => historyNavigation.state.value
    })

    return routerHistory;
}

/**
 * 创建hash模式路由
 */
export function createWebHashHistory() {
    return createWebHistory("#");
}