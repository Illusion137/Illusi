let explore_tab_press_callback: () => any = () => { return; }
export function set_explore_tab_press_callback(fn: () => any){
    explore_tab_press_callback = fn;
}
export function run_explore_tab_press_callback(){
    explore_tab_press_callback();
}