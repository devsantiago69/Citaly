import { Search, Loader2, Users, Calendar, Scissors, FolderHeart, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GlobalSearchProps {
  onSearch?: (term: string) => void;
  placeholder?: string;
}

const typeIcons = {
  service: Scissors,
  client: Users,
  appointment: Calendar,
  category: FolderHeart,
  staff: Users,
  specialty: Award,
};

const GlobalSearch = ({ onSearch, placeholder = "Buscar en Citaly..." }: GlobalSearchProps) => {
  const {
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
  } = useGlobalSearch({ onSearch });

  // Agrupar resultados por tipo
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, typeof results>);
  const groupLabels = {
    service: 'Servicios',
    client: 'Clientes',
    appointment: 'Citas',
    category: 'Categorías',
    staff: 'Personal',
    specialty: 'Especialidades',
  };
  const searchCategories = {
    client: 'Clientes',
    service: 'Servicios',
    staff: 'Personal',
    appointment: 'Citas (YYYY-MM-DD)',
    category: 'Categorías',
    specialty: 'Especialidades',
  };
  const categoryPlaceholders = {
    client: 'Buscar por nombre de cliente...',
    service: 'Buscar por nombre de servicio...',
    staff: 'Buscar por nombre de personal...',
    appointment: 'Buscar por fecha (YYYY-MM-DD)...',
    category: 'Buscar por nombre de categoría...',
    specialty: 'Buscar por nombre de especialidad...',
  };

  return (
    <>
      <div className="w-full max-w-md" onClick={() => setIsOpen(true)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            className="pl-10 pr-10 w-full"
            readOnly
          />
          <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
            <kbd className="inline-flex items-center rounded border bg-muted px-2 font-sans text-xs text-muted-foreground">
              Buscar
            </kbd>
          </div>
        </div>
      </div>

      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <Command className="rounded-lg border shadow-md" onKeyDown={handleKeyDown}>
          <div className="flex items-center border-b px-1">
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-[150px] border-0 shadow-none focus:ring-0 text-muted-foreground">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(searchCategories).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CommandInput
              value={searchTerm}
              onValueChange={handleSearch}
              placeholder={categoryPlaceholders[searchCategory as keyof typeof categoryPlaceholders]}
              className="border-0 shadow-none focus:ring-0 h-11 flex-1"
            />
          </div>
          <CommandList>
            <CommandEmpty>{loading ? 'Buscando...' : 'No se encontraron resultados.'}</CommandEmpty>
            {loading && searchTerm.length > 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup key={type} heading={groupLabels[type as keyof typeof groupLabels]}>
                  {items.map((item) => {
                    const currentIndex = results.findIndex(
                      (result) => result.id === item.id && result.type === item.type
                    );
                    const Icon = typeIcons[item.type as keyof typeof typeIcons];
                    return (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        onSelect={() => {
                          if (currentIndex > -1) {
                            navigateToResult(currentIndex);
                            setIsOpen(false);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 cursor-pointer',
                          selectedIndex === currentIndex && 'bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;