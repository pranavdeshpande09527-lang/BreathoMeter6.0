import { Outlet } from 'react-router-dom'
import DoctorSidebar from './DoctorSidebar'
import DoctorTopbar from './DoctorTopbar'

export default function DoctorShell() {
    return (
        <div className="app-shell">
            <DoctorSidebar />
            <div className="main-content">
                <DoctorTopbar />
                <div className="page-content page-enter">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
