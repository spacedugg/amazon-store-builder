import React from 'react';
export function DeviceIcon({mobile=false}) {
 return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{mobile?<><rect x="6.5" y="2" width="11" height="20" rx="2"/><path d="M10 18.5h4"/></>:<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/></>}</svg>;
}
export function CardTypeIllustration({grid=false}) {
 return <svg className="bs-card-type-illustration" aria-hidden="true" viewBox="0 0 100 125" fill="none"><rect x="1" y="1" width="98" height="123" rx="7" fill="#f1f5f9" stroke="#b8c8d8"/>{grid?<><g fill="#d5e1ec" stroke="#94a8bd"><rect x="8" y="9" width="39" height="47" rx="2"/><rect x="53" y="9" width="39" height="47" rx="2"/><rect x="8" y="62" width="39" height="47" rx="2"/><rect x="53" y="62" width="39" height="47" rx="2"/></g><path d="M9 115h46m-46 5h29" stroke="#8b9fb7" strokeWidth="2"/></>:<><circle cx="69" cy="37" r="10" fill="#b4c7d9"/><path d="m7 101 27-41 20 27 13-17 26 31" fill="#c0d0df" stroke="#94a8bd" strokeWidth="2" strokeLinejoin="round"/></>}</svg>;
}
