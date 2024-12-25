import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import {requestData} from './type'

// creat Axios
const instance = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// request interceptor
instance.interceptors.request.use(
    (config) => config, 
    (error) => Promise.reject(error)
);

// response interceptor
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    const { code, message, data } = response.data;
    if (code != 0){
        alert(message);
        return Symbol()
    }
    return data;
},
  (error) => Promise.reject(error.response || error.message),
);


export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  instance.get(url, {...config });

export const post = <T>(url: string, data?: requestData, config?: AxiosRequestConfig): Promise<T> =>
  instance.post(url, data, config);

export default instance;
