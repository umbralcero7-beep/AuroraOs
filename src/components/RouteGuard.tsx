import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { User } from '../types';

interface RouteGuardProps {
  currentUser: User | null;
  moduleKey: string;
  requiredRoles: string[];
  children: React.ReactNode;
  onLogout: () => void;
}

export default function RouteGuard({ currentUser, moduleKey, requiredRoles, children, onLogout }: RouteGuardProps) {
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#02050d] text-white">
        <div className="text-center p-8 bg-[#071126] border border-cyan-500/20 rounded-2xl shadow-2xl max-w-md w-full">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-mono text-cyan-400 mb-2">SESIÓN EXPIADA</h2>
          <p className="text-sm text-slate-400 mb-6">Por favor, inicie sesión nuevamente.</p>
          <button 
            onClick={onLogout}
            className="bg-cyan-500 text-black px-6 py-2 rounded font-bold uppercase w-full"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentUser.role === 'super_admin';
  const hasRoleAccess = requiredRoles.includes(currentUser.role);
  const hasModuleAccess = currentUser.allowedModules && currentUser.allowedModules.includes(moduleKey);

  if (!isSuperAdmin && !hasRoleAccess && !hasModuleAccess) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#02050d] text-white p-6">
        <div className="text-center p-8 bg-[#071126] border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-mono text-red-400 mb-2 uppercase">Acceso Denegado</h2>
          <p className="text-sm text-slate-400 mb-6">
            Su cuenta no cuenta con los permisos necesarios para acceder a este módulo. Si cree que es un error, contacte a su administrador.
          </p>
          <div className="text-[10px] text-slate-500 font-mono text-left bg-black/40 p-3 rounded mb-6 break-all">
            <p>Usuario: {currentUser.email}</p>
            <p>Rol: {currentUser.role}</p>
            <p>Módulo Solicitado: {moduleKey}</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 border border-slate-600 hover:border-red-500 text-slate-300 hover:text-red-400 px-6 py-2 rounded font-bold uppercase w-full transition-all"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
