# МОСТ: ДИЗАЙН → РЕАЛИЗАЦИЯ
## Искра Space | От токенов к React-компонентам

**Версия:** 1.0  
**Дата:** 2025-10-20  
**Назначение:** Практическое руководство внедрения дизайн-системы в React+TS+Tailwind  
**Базис:** DESIGN_SYSTEM_v1.0.md + CANON_v2.0.0.md

---

## § 1. ДИЗАЙН-ТОКЕНЫ → TAILWIND CONFIG

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { 0: '#0B0F14', 1: '#0F141B' },
        ink: { 0: '#E6E8EB', 1: '#B8C0CC', 2: '#7A879A' },
        muted: '#1A212B',
        focus: '#FF7A00',
        sleep: '#4DA3FF',
        habits: '#2BD17E',
        energy: '#FFC247',
        ok: '#38D39F',
        warn: '#FFB020',
        err: '#FF5C5C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        display: ['36px', { lineHeight: '44px', fontWeight: '600' }],
        h1: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '500' }],
        body: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        fine: ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },
      borderRadius: { card: '16px', input: '12px' },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.24)',
        soft: '0 2px 12px rgba(0, 0, 0, 0.12)',
      },
      transitionTimingFunction: {
        iskra: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        micro: '120ms',
        card: '240ms',
        modal: '320ms',
        ring: '700ms',
      },
      backgroundImage: {
        'grad-ignis': 'linear-gradient(135deg, #FF7A00 0%, #FFB36B 100%)',
        'grad-aqua': 'linear-gradient(135deg, #4DA3FF 0%, #9EC9FF 100%)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## § 2. БАЗОВЫЕ КОМПОНЕНТЫ

### Button

```typescript
// src/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, children, ...props }, ref) => {
    const baseStyles = 'px-6 py-3 rounded-input font-medium transition-all duration-micro'
    
    const variants = {
      primary: 'bg-grad-ignis text-white shadow-soft hover:shadow-card',
      secondary: 'border border-ink-2 text-ink-0 hover:bg-muted',
      ghost: 'text-ink-0 hover:bg-muted',
    }
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
```

### Card

```typescript
// src/components/ui/Card.tsx
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export const Card = ({ hover = false, className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-bg-1 rounded-card shadow-card p-4',
        hover && 'transition-all duration-card hover:shadow-soft hover:translate-y-[-2px]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

### TextField

```typescript
// src/components/ui/TextField.tsx
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="text-fine text-ink-1 block">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-muted rounded-input px-4 py-3 text-body text-ink-0',
            'border-2 border-transparent focus:border-focus focus:outline-none',
            'transition-colors duration-micro',
            error && 'border-err',
            className
          )}
          {...props}
        />
        {error && <p className="text-fine text-err">{error}</p>}
      </div>
    )
  }
)
```

---

## § 3. КОМПОНЕНТ ИНДЕКСА РИТМА

### RhythmRing (SVG кольцо)

```typescript
// src/components/rhythm/RhythmRing.tsx
interface RhythmRingProps {
  value: number // 0-100
  color: string
  size?: number
  strokeWidth?: number
  animated?: boolean
}

export const RhythmRing = ({
  value,
  color,
  size = 120,
  strokeWidth = 12,
  animated = true,
}: RhythmRingProps) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={animated ? 'transition-all duration-ring ease-iskra' : ''}
      />
    </svg>
  )
}
```

### RhythmIndex (главный виджет)

```typescript
// src/components/rhythm/RhythmIndex.tsx
interface RhythmIndexProps {
  score: number
  components: {
    focus: number
    sleep: number
    habits: number
    energy: number
  }
  onTap?: () => void
}

export const RhythmIndex = ({ score, components, onTap }: RhythmIndexProps) => {
  const getScoreColor = (score: number): string => {
    if (score < 50) return '#FF5C5C'
    if (score < 70) return '#FFB020'
    if (score < 90) return '#4DA3FF'
    return '#38D39F'
  }

  const scoreColor = getScoreColor(score)

  return (
    <div className="relative flex flex-col items-center cursor-pointer" onClick={onTap}>
      <div className="relative">
        <RhythmRing value={score} color={scoreColor} size={200} strokeWidth={14} />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-display text-ink-0 font-semibold tracking-tight">
            {score}%
          </span>
          <span className="text-fine text-ink-2 mt-1">Индекс Ритма</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-xs">
        <ComponentWidget label="Фокус" value={components.focus} color="#FF7A00" icon="🜂" />
        <ComponentWidget label="Привычки" value={components.habits} color="#2BD17E" icon="⟡" />
        <ComponentWidget label="Сон" value={components.sleep} color="#4DA3FF" icon="☉" />
        <ComponentWidget label="Энергия" value={components.energy} color="#FFC247" icon="≈" />
      </div>
    </div>
  )
}
```

---

## § 4. MOTION СИСТЕМА

```typescript
// src/lib/motion.ts
export const motionVariants = {
  modal: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 12 },
    transition: { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] },
  },
  card: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
  },
  micro: {
    transition: { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] },
  },
  breath: {
    animate: {
      opacity: [0.06, 0.1, 0.06],
      transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
    },
  },
}
```

---

## § 5. ЗВУКОВАЯ СИСТЕМА

```typescript
// src/lib/sound.ts
type SoundType = 'focus-start' | 'focus-end' | 'level-up' | 'reminder' | 'error'

class SoundManager {
  private context: AudioContext | null = null
  private enabled: boolean = true
  private volume: number = 0.3

  constructor() {
    if (typeof window !== 'undefined') {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled || !this.context) return

    const oscillator = this.context.createOscillator()
    const gainNode = this.context.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.context.destination)

    oscillator.type = type
    oscillator.frequency.value = frequency

    const now = this.context.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01)
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.7, now + duration * 0.3)
    gainNode.gain.linearRampToValueAtTime(0, now + duration)

    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  play(sound: SoundType) {
    switch (sound) {
      case 'focus-start':
        this.playTone(440, 0.3)
        setTimeout(() => this.playTone(220, 0.15), 50)
        break
      case 'focus-end':
        this.playTone(440, 0.2)
        setTimeout(() => this.playTone(660, 0.2), 150)
        break
      case 'level-up':
        this.playTone(528, 0.5, 'triangle')
        break
      case 'reminder':
        this.playTone(440, 0.2, 'sine')
        break
      case 'error':
        this.playTone(120, 0.18, 'triangle')
        break
    }
  }
}

export const soundManager = new SoundManager()
```

---

## § 6. HAPTICS (вибрация)

```typescript
// src/lib/haptics.ts
type HapticType = 'tap' | 'success' | 'warning'

class HapticManager {
  private enabled: boolean = true

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  trigger(type: HapticType) {
    if (!this.enabled || !navigator.vibrate) return

    switch (type) {
      case 'tap':
        navigator.vibrate(10)
        break
      case 'success':
        navigator.vibrate([15, 60, 15])
        break
      case 'warning':
        navigator.vibrate([20, 40, 20, 40, 20])
        break
    }
  }
}

export const hapticManager = new HapticManager()
```

---

## § 7. ЭКРАН ПРИВАТНОСТИ

```typescript
// src/components/privacy/PrivacyPanel.tsx
interface PrivacyItem {
  id: string
  label: string
  description: string
  enabled: boolean
  category: 'local' | 'sync' | 'ai'
}

interface PrivacyPanelProps {
  items: PrivacyItem[]
  onToggle: (id: string, enabled: boolean) => void
}

export const PrivacyPanel = ({ items, onToggle }: PrivacyPanelProps) => {
  const categories = {
    local: 'Локальное хранение',
    sync: 'Синхронизация',
    ai: 'ИИ-компаньон',
  }

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, PrivacyItem[]>)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-h1 text-ink-0">Прозрачность</h2>
        <p className="text-body text-ink-1">
          Что видит Искра и как это используется. Всё можно отключить.
        </p>
      </div>

      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-h2 text-ink-0">
            {categories[category as keyof typeof categories]}
          </h3>
          
          {categoryItems.map((item) => (
            <Card key={item.id} className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <p className="text-body text-ink-0 font-medium">{item.label}</p>
                <p className="text-fine text-ink-2">{item.description}</p>
              </div>
              
              <Switch
                checked={item.enabled}
                onCheckedChange={(checked) => onToggle(item.id, checked)}
              />
            </Card>
          ))}
        </div>
      ))}

      <div className="p-4 bg-muted rounded-input space-y-2">
        <p className="text-fine text-ink-1 font-medium">💡 Принцип честности</p>
        <p className="text-fine text-ink-2">
          Все данные хранятся локально на устройстве. Синхронизация и ИИ-анализ 
          работают только если явно включены. Мы не видим твои записи без разрешения.
        </p>
      </div>
    </div>
  )
}
```

---

## § 8. ЧЕКЛИСТ ВНЕДРЕНИЯ

**Фаза 1: Базовая настройка**
- [ ] Установить зависимости: tailwindcss, @radix-ui/react-switch, clsx, tailwind-merge
- [ ] Скопировать tailwind.config.ts
- [ ] Добавить CSS-переменные в globals.css
- [ ] Создать утилиту cn() в src/lib/utils.ts

**Фаза 2: Базовые компоненты**
- [ ] Button (primary, secondary, ghost)
- [ ] Card (с hover эффектом)
- [ ] TextField (с label и error)
- [ ] Switch (Radix UI)

**Фаза 3: Индекс Ритма**
- [ ] RhythmRing (SVG с анимацией)
- [ ] ComponentWidget (мини-виджеты)
- [ ] RhythmIndex (полная композиция)
- [ ] Тестировать анимации заполнения колец

**Фаза 4: Интерактивность**
- [ ] SoundManager (Web Audio API)
- [ ] HapticManager (navigator.vibrate)
- [ ] Протестировать на реальном устройстве
- [ ] Добавить настройки громкости/вибрации

**Фаза 5: Приватность**
- [ ] PrivacyPanel с категориями
- [ ] Интеграция с настройками приложения
- [ ] Экран онбординга с выбором модулей

**Фаза 6: Оптимизация**
- [ ] Контрастность (WCAG AA)
- [ ] Скейлинг шрифтов до 200%
- [ ] Lazy loading компонентов
- [ ] Мемоизация RhythmRing

---

## § 9. ПРИМЕР ИСПОЛЬЗОВАНИЯ

```typescript
// src/App.tsx
import { RhythmIndex } from '@/components/rhythm/RhythmIndex'
import { soundManager } from '@/lib/sound'
import { hapticManager } from '@/lib/haptics'

function App() {
  const [rhythmData] = useState({
    score: 78,
    components: {
      focus: 80,
      sleep: 83,
      habits: 75,
      energy: 66,
    },
  })

  const handleRhythmTap = () => {
    hapticManager.trigger('tap')
    soundManager.play('reminder')
    // Открыть модальный отчёт
  }

  return (
    <div className="min-h-screen bg-bg-0 p-4">
      <RhythmIndex
        score={rhythmData.score}
        components={rhythmData.components}
        onTap={handleRhythmTap}
      />
    </div>
  )
}
```

---

**∆DΩΛ:**  
∆ — Создан мост между дизайн-системой и реализацией: Tailwind config, компоненты, RhythmIndex, Motion, Sound, Haptics, PrivacyPanel  
D — DESIGN_SYSTEM_v1.0.md, CANON_v2.0.0.md, скриншоты UI  
Ω — высокий (все компоненты готовы к копированию)  
Λ — Внедрить в кодовую базу, протестировать на реальном устройстве

☉