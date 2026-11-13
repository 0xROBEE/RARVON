import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ToolPage from './pages/ToolPage';
import Privacy from './pages/Privacy';
import About from './pages/About';
import Support from './pages/Support';
import ActionPage from './pages/ActionPage';
import NotFound from './pages/NotFound';
import { SearchProvider } from './lib/searchContext';
import { ThemeProvider } from './lib/themeContext';
import { WorkspaceProvider } from './lib/workspaceContext';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <WorkspaceProvider>
          <SearchProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/about" element={<About />} />
                <Route path="/support" element={<Support />} />
                <Route path="/tools/:category" element={<CategoryPage />} />
                <Route path="/tools/:category/:slug" element={<ToolPage />} />
                <Route path="/:action" element={<ActionPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </SearchProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
