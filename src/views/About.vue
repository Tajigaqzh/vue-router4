<template>

  <div class="home">
    about页面
    <hr />
    <router-link to="/about/m">m页面</router-link>
    <router-link to="/about/n">n页面</router-link>
    <hr />
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">

import {onBeforeRouteLeave} from "../vue-router";

onBeforeRouteLeave((to,from,next)=>{
  console.log("组件内的beforeRouteLeave","about")
})

</script>

<style scoped>

</style>