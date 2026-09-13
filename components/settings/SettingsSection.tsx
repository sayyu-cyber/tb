import type { LucideIcon } from "lucide-react";
export function SettingsSection({id,title,icon:Icon,tone,children}: {
  id:string; title:string; icon:LucideIcon; tone:"teal"|"gold"|"blue"; children:React.ReactNode;
}) {
  return <section id={"settings-"+id} className={"settings-section settings-tone-"+tone} tabIndex={-1} aria-labelledby={"settings-heading-"+id}>
    <h2 id={"settings-heading-"+id}><span><Icon size={22} aria-hidden="true" /></span>{title}</h2>
    {children}
  </section>;
}
