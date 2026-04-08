import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import DoctorSidebar from './DoctorSidebar'
import DoctorTopbar from './DoctorTopbar'
import { SidebarProvider, useSidebar } from './SidebarContext'

function DoctorShellInner() {
    const { isOpen, close } = useSidebar()

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    return (
        <div className="app-shell">
            <DoctorSidebar />
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={close}
                    aria-hidden="true"
                />
            )}
            <div className="main-content">
                <DoctorTopbar />
                <div className="page-content page-enter">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default function DoctorShell() {
    return (
        <SidebarProvider>
            <DoctorShellInner />
        </SidebarProvider>
    )
}
