import {createWebHistory, RouterHistory} from './html5'

export function createWebHashHistory(): RouterHistory {
    return createWebHistory('#');
}
