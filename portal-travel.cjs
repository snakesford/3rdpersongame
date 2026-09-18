// Mirrors the existing tiles/spawns in modules/constants.js and gameModes.js.
// Tests compare these routes with actual world transitions to catch map drift.
const routes = [
  {from:'village',to:'main',tile:{x:1070,y:370,size:80},spawn:{x:250,y:740}},
  {from:'village',to:'tutorial',tile:{x:1190,y:505,size:80},spawn:{x:1200,y:1090}},
  {from:'main',to:'village',tile:{x:800,y:850,size:90},spawn:{x:1810,y:1250}},
  {from:'tutorial',to:'village',tile:{x:1360,y:1270,size:96},spawn:{x:1810,y:1250}},
  {from:'main',to:'tutorial',tile:{x:670,y:850,size:90},spawn:{x:1200,y:1090}},
  {from:'tutorial',to:'main',tile:{x:1200,y:1270,size:96},spawn:{x:250,y:740}},
  {from:'tutorial',to:'waves',tile:{x:1520,y:1270,size:96},spawn:{x:1200,y:950}},
  {from:'main',to:'arena',tile:{x:570,y:850,size:90},spawn:{x:2060,y:280}},
  {from:'arena',to:'main',spawn:{x:290,y:740}},
  {from:'waves',to:'tutorial',spawn:{x:1200,y:1090}},
];
function isPortalTravel(previous, next) {
  // A sprinting player can enter a tile between 20 Hz movement samples.
  const tolerance=80;
  return routes.some(route => route.from===previous.worldId && route.to===next.worldId &&
    (!route.tile || Math.hypot(
      previous.x-Math.max(route.tile.x,Math.min(previous.x,route.tile.x+route.tile.size)),
      previous.y-Math.max(route.tile.y,Math.min(previous.y,route.tile.y+route.tile.size))) <= tolerance) &&
    Math.hypot(next.x-route.spawn.x,next.y-route.spawn.y) <= tolerance);
}
module.exports={routes,isPortalTravel};
