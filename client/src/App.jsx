import { Routes, Route } from 'react-router-dom';
import Layout     from './components/Layout.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import Products   from './pages/Products.jsx';
import Orders     from './pages/Orders.jsx';
import Customers  from './pages/Customers.jsx';
import Analytics  from './pages/Analytics.jsx';
import Platforms  from './pages/Platforms.jsx';
import Chat       from './pages/Chat.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index             element={<Dashboard />} />
        <Route path="products"   element={<Products />} />
        <Route path="orders"     element={<Orders />} />
        <Route path="customers"  element={<Customers />} />
        <Route path="analytics"  element={<Analytics />} />
        <Route path="platforms"  element={<Platforms />} />
        <Route path="chat"       element={<Chat />} />
      </Route>
    </Routes>
  );
}
