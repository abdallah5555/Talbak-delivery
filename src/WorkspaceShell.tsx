import {ReactNode} from "react";
import RoleSwitcher from "./RoleSwitcher";
import LiveAlerts from "./LiveAlerts";
import WorkspaceQuickActions from "./WorkspaceQuickActions";
import WorkspaceMap from "./WorkspaceMap";
import MerchantInventory from "./MerchantInventory";
import DriverOperations from "./DriverOperations";
import AdminCoupons from "./AdminCoupons";
import "./workspace.css";

type Role="customer"|"merchant"|"driver"|"admin";
const labels:Record<Role,string>={customer:"واجهة العميل",merchant:"واجهة التاجر",driver:"واجهة السائق",admin:"لوحة الإدارة"};

export default function WorkspaceShell({role,children}:{role:Role;children:ReactNode}){
 return <div className={`workspace-root workspace-${role}`} data-role={role}>
   <div className="workspace-bar" dir="rtl">
     <div className="workspace-identity"><span className="workspace-dot"/><b>طلبك</b><span>{labels[role]}</span></div>
     <div className="workspace-bar-actions"><WorkspaceMap role={role}/><WorkspaceQuickActions role={role}/><RoleSwitcher current={role}/></div>
   </div>
   <LiveAlerts/>
   <div className="workspace-content">{children}</div>
   {role==="merchant"&&<div className="merchant-ops-drawer"><MerchantInventory/></div>}
   {role==="driver"&&<div className="driver-ops-drawer"><DriverOperations/></div>}
   {role==="admin"&&<div className="admin-ops-drawer"><AdminCoupons/></div>}
 </div>;
}
