# 前端路由的两种模式

history和hash

window.location.hash

```js
history.putState(state,null,url)
```
参数解析，第一个是传递的状态，第二个参数是name，第三个参数是显示的url

history.replaceState()

目前浏览器都支持两种模式，使用putState也可以实现hash模式，url前面加上#即可
```js
history.putState(state,null,"#/")
```



两种路由的区别

hash模式就是锚点，刷新浏览器不会发送请求，只是改变了url，hash后面的内容会被当做锚点，不会发送到服务器，不会产生404，但是不支持服务端渲染，不能
seo优化

history模式是真实的url，刷新浏览器会发送请求到服务器，需要服务器端配置，否则会出现404，解决方案，后端配置一个通配符，如果没有匹配到其他路由，就
返回index.html，然后前端路由接管，显示对应的页面，支持服务端渲染，可以seo优化


## 路由系统

路由系统最基本的需要包含当前的路径，当前路径的转台是什么，需要提供两个切换路径的方法，push，replace

还要实现路由监听，如果路由变化需要通知用户


