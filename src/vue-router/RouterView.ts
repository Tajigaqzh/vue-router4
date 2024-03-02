import {computed, defineComponent, h, inject, provide, UnwrapNestedRefs} from "vue";
import {ReactiveRoute} from "./index.ts";

/**
 * 根据匹配的对象渲染对应组件
 */
export const HpRouterView = defineComponent((_props, ctx) => {
    const depth = inject('depth', 0);
    const injectRoute = inject("route location") as UnwrapNestedRefs<ReactiveRoute>;

    // 因为匹配到的值会变，所以matchedRouteRef是个动态的
    const matchedRouteRef = computed(() => injectRoute.matched[depth])

    provide("depth", depth + 1);

    return () => {
        const matchRouteRecord = matchedRouteRef.value;
        const viewComponent = matchRouteRecord && matchRouteRecord.components.default;
        if (!viewComponent){
            return ctx.slots.default && ctx.slots.default()
        }
        return h(viewComponent)
    }
},{
    name:'HpRouterView'
})

export type RouterView = typeof HpRouterView;
