import type { UserRole } from "@/generated/prisma/client";
import { logoutAction } from "@/app/actions/auth-actions";
import { ShieldCheck } from "lucide-react";
import { PortalSidebarNav } from "@/components/layout/PortalSidebarNav";

//export function PortalLayout({ children }: { children: React.ReactNode }) {
	type PortalLayoutProps = {
	  children: React.ReactNode;
	  tenantName?: string;
	  tenantInitials?: string;
	  userName?: string;
	  userEmail?: string;
	  userRole?: UserRole;
	};

	export function PortalLayout({
	  children,
	  tenantName = "Partsec One",
	  tenantInitials = "PO",
	  userName = "Usuário",
	  userEmail = "",
	  userRole,
	}: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <aside className="fixed left-0 top-0 z-20 flex h-screen w-72 flex-col bg-[#071426] text-white print:hidden">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white px-4 py-4">
              <img
                src="/images/partsec-logo.png"
                alt="Partsec"
                className="h-auto w-full object-contain"
              />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight text-white">
                Partsec One
              </div>
              <div className="text-xs text-slate-300">Customer Portal</div>
            </div>
          </div>
        </div>

        <PortalSidebarNav userRole={userRole} />

        <div className="border-t border-white/10 px-6 py-5">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              Ambiente monitorado
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Visão consolidada de segurança, disponibilidade e atendimento.
            </p>
          </div>
        </div>
      </aside>

      <main className="ml-72 min-h-screen print:ml-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-8 py-5 backdrop-blur print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">Cliente</div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {tenantName}
              </h1>
            </div>
		<div className="flex items-center gap-3">
		  <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
			Operação normal
		  </div>

		  <div className="hidden text-right md:block">
			<div className="text-sm font-bold text-slate-900">{userName}</div>
			<div className="text-xs text-slate-500">
			  {userRole ?? "Perfil não definido"}
			  {userEmail ? ` · ${userEmail}` : ""}
			</div>
		  </div>

		  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
			{tenantInitials}
		  </div>

		  <form action={logoutAction}>
			<button
			  type="submit"
			  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
			>
			  Sair
			</button>
		  </form>
		</div>
          </div>
        </header>

        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
