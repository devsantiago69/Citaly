import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string | number;
  type: 'service' | 'appointment' | 'client' | 'category' | 'staff';
  title: string;
  subtitle?: string;
  route: string;
}

interface UseGlobalSearchProps {
  onSearch?: (term: string) => void;
}

export function useGlobalSearch({ onSearch }: UseGlobalSearchProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('client');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const searchAPI = async (term: string, category: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `http://localhost:3001/api/search?term=${encodeURIComponent(term)}&type=${encodeURIComponent(category)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Respuesta del servidor:', errorText);
        throw new Error(`Error en la búsqueda: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error detallado al buscar:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    searchAPI(term, searchCategory);
    onSearch?.(term);
  };

  useEffect(() => {
    setSearchTerm('');
    setResults([]);
  }, [searchCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].route);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const navigateToResult = (index: number) => {
    if (results[index]) {
      navigate(results[index].route);
      setIsOpen(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    searchTerm,
    results,
    loading,
    selectedIndex,
    handleSearch,
    handleKeyDown,
    searchCategory,
    setSearchCategory,
    navigateToResult,
  };
}
