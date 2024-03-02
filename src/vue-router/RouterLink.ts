import {defineComponent, h, inject, SetupContext} from "vue";
import {Router} from "./index.ts";

/**
 * types declaration
 */
export interface useLinkResult {
    navigate: (props: HpRouterLinkProps) => void
}

export interface HpRouterLinkProps {
    to: string
}

function useLink(): useLinkResult {
    const router = inject<Router>('router') as unknown as Router;

    /**
     * router不能在navigate中注入，要注入到setup中
     * HpRouterLink中的 const link = useLink();调用了function useLink()，实现了在setup中注入
     * @param props
     */
    function navigate(props: HpRouterLinkProps) {
        router.push(props.to)
    }

    return {
        navigate
    }
}

/**
 * HpRouterLink core method
 */
export const HpRouterLink = defineComponent((props: HpRouterLinkProps, ctx: SetupContext) => {
    const link = useLink();
    return () => {
        return h('a', {onClick: () => link.navigate(props)}, ctx.slots.default && ctx.slots.default());
    }
}, {
    props: {
        to: {
            type: [String, Object],
            required: true
        }
    },
    name:"HpRouterLink"
})

/**
 * types of HpRouterLink
 */
export type RouterLinkType = InstanceType<typeof HpRouterLink>;