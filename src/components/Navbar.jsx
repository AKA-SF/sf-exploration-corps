import { NavLink } from 'react-router-dom';
import { Award, Crosshair, User, Radio } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="navbar">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <Crosshair />
        <span className="mono">MAP</span>
      </NavLink>
      <NavLink to="/network" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <Radio />
        <span className="mono">NETWORK</span>
      </NavLink>
      <NavLink to="/badges" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <Award />
        <span className="mono">BADGES</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <User />
        <span className="mono">DOSSIER</span>
      </NavLink>
    </nav>
  );
};

export default Navbar;
