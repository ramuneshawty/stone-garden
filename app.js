if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{document.documentElement.dataset.offlineReady='true'}).catch(console.error)})}

// Keep touch gestures on the playing surface from moving the page on iOS.
const playingSurface=document.querySelector('.arena');
if(playingSurface)playingSurface.addEventListener('touchmove',event=>{if(event.cancelable)event.preventDefault()},{passive:false});
