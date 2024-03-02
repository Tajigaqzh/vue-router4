<template>
  <div class="home">
    首页
    <hr />

    <router-link to="/a">a页面</router-link>
    <router-link to="/b">b页面</router-link>
    <hr />
    <router-view></router-view>
  </div>
</template>

<!--<script setup lang="ts">-->
<script lang="ts">
export default {
  beforeRouteLeave(to,from,next){
    console.log("home组件内的beforeRouteLeave")
  },
  beforeRouteUpdate(to,from,next){
    console.log("组件内的beforeRouteUpdate","home")
  },
  beforeRouteEnter(to,from,next){
    console.log("组件内的beforeRouteEnter")
  },
}
// import {useRoute, useRouter} from "../vue-router";
// import {onBeforeRouteLeave, onBeforeRouteUpdate,beforeRouteEnter} from "../vue-router";
// beforeRouteEnter((to,from,next)=>{
//   console.log("组件内的beforeRouteEnter")
// })
// onBeforeRouteUpdate((to,from,next)=>{
//   console.log("组件内的beforeRouteUpdate")
// })
// onBeforeRouteLeave((to,from,next)=>{
//   console.log("组件内的beforeRouteLeave")
// })

// const router = useRouter();
// console.log(router)
// const route = useRoute()
//
// console.log(route)
/**
 * // 路由的钩子解析顺序
 * a leave
 * beforeEach
 * b beforeEnter
 * b beforeRouteEnter
 * b resolve
 * afterEach
 */


</script>

<style scoped>

</style>