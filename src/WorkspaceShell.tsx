import {ReactNode} from "react";
import RoleSwitcher from "./RoleSwitcher";
import LiveAlerts from "./LiveAlerts";
import "./workspace.css";

type Role="customer"|"merchant"|"driver"|"admin";
const labels:Record<Role,string>={customer:"واجهة العميل",merchant:"واجهة التاجر",driver:"واجهة السائق",admin:"لوحة الإدارة"};

export default function WorkspaceShell({role,children}:{role:Role;children:ReactNode}){
 return <div className={`workspace-root workspace-${role}`} data-role={role}>
   <div className="workspace-bar" dir="rtl">
     <div className="workspace-identity"><span className="workspace-dot"/><b>طلبك</b><span>{labels[role]}</span></div>
     <RoleSwitcher current={role}/>
   </div>
   <LiveAlerts/>
   <div className="workspace-content">{children}</div>
 </div>;
}
