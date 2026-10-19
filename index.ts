import { registerRootComponent } from 'expo';

import App from './App';

// 统一注册入口，让同一份代码能在 Expo Go 和后续独立安装包中启动。
registerRootComponent(App);
