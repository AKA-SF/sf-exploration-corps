import { NavLink } from 'react-router-dom';
import { Compass, PenLine, Radio, UserRound } from 'lucide-react';

const Navbar = () => {
  return (
    <nav aria-label="주요 메뉴" className="navbar">
      <NavLink
        to="/works/novels"
        end
        className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
      >
        <Compass aria-hidden="true" />
        <span className="nav-label-primary">탐색</span>
        <span className="nav-label-secondary mono">DISCOVER</span>
      </NavLink>
      <NavLink to="/log" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <PenLine aria-hidden="true" />
        <span className="nav-label-primary">기록</span>
        <span className="nav-label-secondary mono">LOG</span>
      </NavLink>
      <NavLink to="/network" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <Radio aria-hidden="true" />
        <span className="nav-label-primary">네트워크</span>
        <span className="nav-label-secondary mono">SIGNALS</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <UserRound aria-hidden="true" />
        <span className="nav-label-primary">내 정보</span>
        <span className="nav-label-secondary mono">PROFILE</span>
      </NavLink>
    </nav>
  );
};

export default Navbar;
