// Each message gets its full reading time. Injectable clock for deterministic tests.
export function createToastQueue(show, hide, { set = setTimeout, clear = clearTimeout } = {}) {
  const pending=[]; let active=null, timer=null;
  const next=()=>{active=pending.shift()||null;if(!active){hide();return;}show(active);timer=set(()=>{timer=null;hide();active=null;next();},active.ms);};
  return {
    push(message){pending.push(message);if(!active)next();},
    dismiss(){if(timer!==null)clear(timer);timer=null;hide();active=null;next();},
    get active(){return active;},
  };
}
