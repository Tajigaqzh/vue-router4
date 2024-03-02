import Home from '../views/Home.vue'
import About from '../views/About.vue'

import {createRouter, createWebHistory, RouteRecordRaw} from '../vue-router'
import {defineComponent, h} from "vue";
// import {createRouter, createWebHistory, RouteRecordRaw} from "vue-router";

const commonComponent = (name: string, content: string) => {
    return defineComponent((_props, _ctx) => {
        return () => {
            return h('div', content)
        }
    }, {
        name: name
    })
}

const A = commonComponent("a", "a页面");
const B = commonComponent("CV", "CV页面");
const M = commonComponent("m", "m页面");
const N = commonComponent("n", "n页面");

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        beforeEnter(to, from, _next) {
            console.log(to, from, "beforeEnter")
        },
        children: [
            {
                path: "a",
                component: A
            },
            {
                path: "b",
                component: B
            }
        ]
    },
    {
        path: '/about',
        name: 'About',
        component: About,
        children: [
            {
                path: "m",
                component: M
            },
            {
                path: "n",
                component: N
            }
        ]

        // jsx 语法

    }
]
const router = createRouter({ // mode
    history: createWebHistory(),
    routes
})


router.beforeEach((to, from, _next) => {
    console.log(to, from, "beforeEach")
})
router.beforeResolve((to, from, _next) => {
    console.log(to, from, "beforeResolve")
})

router.afterEach((to, from, _next) => {
    console.log(to, from, "afterEach")
})

export default router
