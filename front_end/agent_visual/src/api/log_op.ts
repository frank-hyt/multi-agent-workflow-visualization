import {NodeLog} from './type';
import { post } from './index';



// get log
export const logNode = (data: NodeLog): Promise<string[]> =>
    post('/task_log', data);