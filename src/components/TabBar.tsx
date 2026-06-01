interface Tab {
  id: number
  label: string
  isValid: boolean | null  // null = 未入力
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: number
  onSelect: (id: number) => void
}

export function TabBar({ tabs, activeTab, onSelect }: TabBarProps) {
  return (
    <nav className="flex border-b border-gray-200">
      {tabs.map((tab) => {
        const badge =
          tab.isValid === null ? null
          : tab.isValid
          ? <span className="ml-1 text-green-600 text-xs">✓</span>
          : <span className="ml-1 text-red-500 text-xs">✗</span>

        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {badge}
          </button>
        )
      })}
    </nav>
  )
}
