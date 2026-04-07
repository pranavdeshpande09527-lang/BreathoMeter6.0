import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-content">
                <Topbar />
                <div className="page-content page-enter">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
