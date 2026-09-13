export const useAuth = () => ({user:{uid:"test",displayName:"Test Player",email:location.search.includes("admin")?"admin@test.test":"player@test.test"},isGuest:false,
  logout:async()=>{if(location.search.includes("fail"))throw Error("offline");document.body.dataset.loggedOut="true";}});
export const useToast = () => ({showToast:(message:string)=>{document.body.dataset.toast=message;}});
export const isAdminEmail = (email:string) => email==="admin@test.test";
