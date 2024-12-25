import {ProjDir, ProjUpdate, TaskStatus, RunTask} from './type';
import {get, post } from './index';


// get dir
export const getProjDir = (): Promise<string> => get('/get_proj_dir');


// set_proj_dir
export const updateProjDir = (data: ProjDir): Promise<ProjUpdate> =>
    post('/set_proj_dir', data);


// init_proj
export const readProj = (): Promise<ProjUpdate> => get('/read_the_proj');


// save_the_proj
export const saveProj = (): Promise<null> => get('/save_the_proj');


// run_the_proj
export const runProj = (data: RunTask): Promise<null> => 
    post('/run_the_proj', data);


// task_status
export const getTaskStatus = (): Promise<TaskStatus> => get('/task_status');


// stop_run
export const stopTask = (): Promise<null> => get('/stop_run');

