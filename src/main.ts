import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

import router from "./router";

const app = createApp(App);

app.use(router);
// use(router) 会调用 router.install(app
app.mount("#app");
