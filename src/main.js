import Vue from 'vue'
import App from './App.vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'

library.add(fas);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount('#app');
