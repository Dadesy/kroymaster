<template>
  <section class="seo-wrap" aria-label="Информация о сервисе">
    <div class="seo-inner">

      <!-- Hero description -->
      <div class="seo-hero">
        <h2 class="seo-h2">Бесплатный калькулятор раскроя листовых материалов</h2>
        <p class="seo-lead">
          Онлайн-инструмент для оптимального размещения деталей на листе: <strong>стекло</strong>,
          <strong>металл</strong>, <strong>фанера</strong>, <strong>ДСП и МДФ</strong>,
          <strong>акрил</strong>, <strong>поликарбонат</strong>, <strong>ПВХ</strong>,
          <strong>ткань</strong> — любой прямоугольный листовой материал.
          Алгоритм минимизирует отходы и учитывает пропил.
        </p>
      </div>

      <!-- Materials grid -->
      <div class="materials">
        <h3 class="seo-h3">Для каких материалов подходит</h3>
        <ul class="mat-grid">
          <li v-for="m in materials" :key="m.name" class="mat-item">
            <span class="mat-icon">{{ m.icon }}</span>
            <div>
              <strong>{{ m.name }}</strong>
              <span class="mat-desc">{{ m.desc }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- How it works -->
      <div class="how">
        <h3 class="seo-h3">Как пользоваться</h3>
        <ol class="steps">
          <li class="step">
            <span class="step-num">1</span>
            <div>
              <strong>Задайте размер листа</strong>
              <p>Укажите ширину и высоту вашего исходного листа в миллиметрах.</p>
            </div>
          </li>
          <li class="step">
            <span class="step-num">2</span>
            <div>
              <strong>Добавьте детали</strong>
              <p>Введите размеры и количество каждой детали. Можно задать название для удобства.</p>
            </div>
          </li>
          <li class="step">
            <span class="step-num">3</span>
            <div>
              <strong>Получите схему раскроя</strong>
              <p>Алгоритм автоматически разместит детали с минимальными отходами. Скачайте SVG или скопируйте таблицу координат.</p>
            </div>
          </li>
        </ol>
      </div>

      <!-- FAQ -->
      <div class="faq" itemscope itemtype="https://schema.org/FAQPage">
        <h3 class="seo-h3">Частые вопросы</h3>
        <div
          v-for="(item, i) in faq"
          :key="i"
          class="faq-item"
          itemscope
          itemprop="mainEntity"
          itemtype="https://schema.org/Question"
        >
          <button
            class="faq-q"
            :aria-expanded="openFaq === i"
            @click="openFaq = openFaq === i ? null : i"
          >
            <span itemprop="name">{{ item.q }}</span>
            <span class="faq-chevron" :class="{ open: openFaq === i }">▾</span>
          </button>
          <div
            v-show="openFaq === i"
            class="faq-a"
            itemscope
            itemprop="acceptedAnswer"
            itemtype="https://schema.org/Answer"
          >
            <p itemprop="text">{{ item.a }}</p>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const openFaq = ref<number | null>(null)

const materials = [
  { icon: '🪟', name: 'Стекло и зеркала', desc: 'оконное, витринное, зеркальное' },
  { icon: '🔩', name: 'Металл', desc: 'сталь, алюминий, оцинковка, жесть' },
  { icon: '🪵', name: 'Дерево и плиты', desc: 'фанера, ДСП, МДФ, ОСБ, массив' },
  { icon: '🧪', name: 'Пластик', desc: 'акрил, поликарбонат, ПВХ, АБС' },
  { icon: '🧵', name: 'Ткань и кожа', desc: 'для швейного и кожевенного производства' },
  { icon: '🧱', name: 'Прочие листовые', desc: 'гипсокартон, пенопласт, резина, картон' },
]

const faq = [
  {
    q: 'Что такое оптимальный раскрой?',
    a: 'Оптимальный раскрой — это размещение всех нужных деталей на листе материала таким образом, чтобы площадь отходов (обрезков) была минимальной. Наш калькулятор использует алгоритм MaxRects (максимальных прямоугольников) — один из лучших алгоритмов двумерной упаковки.',
  },
  {
    q: 'Для каких материалов подходит калькулятор?',
    a: 'Калькулятор подходит для любого прямоугольного листового материала: стекло, зеркала, металлический лист, фанера, ДСП, МДФ, ОСБ, акрил, поликарбонат, ПВХ, ткань, кожа, гипсокартон, пенопласт и другие.',
  },
  {
    q: 'Что такое пропил и зачем его учитывать?',
    a: 'Пропил — это толщина реза инструмента (пилы, стеклореза, лазера). При раскрое каждый рез "съедает" несколько миллиметров материала. Включите опцию "Пропил" и укажите размер в мм, чтобы учесть этот зазор между деталями.',
  },
  {
    q: 'Можно ли повернуть детали на 90°?',
    a: 'Да, алгоритм автоматически пробует оба варианта ориентации каждой детали и выбирает наилучший. Если деталь была повёрнута, на схеме отображается иконка ↻.',
  },
  {
    q: 'Как получить таблицу кроя для резчика?',
    a: 'Откройте "Таблицу кроя" под схемой — в ней указаны координаты X и Y каждой детали на листе (от левого верхнего угла). Нажмите "Копировать список" для вставки в Excel или передачи оператору станка.',
  },
  {
    q: 'Как скачать схему раскроя?',
    a: 'Нажмите кнопку "⬇ SVG" над схемой — файл сохранится в формате SVG. Его можно открыть в любом векторном редакторе (Inkscape, Adobe Illustrator) или браузере, распечатать или передать на производство.',
  },
  {
    q: 'Сохраняются ли данные при закрытии страницы?',
    a: 'Да, калькулятор автоматически сохраняет размеры листа, список деталей и настройки пропила в браузере (localStorage). При следующем открытии все данные восстановятся.',
  },
]
</script>

<style scoped>
.seo-wrap {
  background: white;
  border-top: 1px solid #F1F5F9;
  margin-top: 8px;
}

.seo-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 48px 24px 56px;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

/* Hero */
.seo-hero {
  max-width: 760px;
}

.seo-h2 {
  font-size: 22px;
  font-weight: 800;
  color: #1E293B;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.seo-lead {
  font-size: 15px;
  color: #475569;
  line-height: 1.7;
}

.seo-lead strong { color: #1E293B; }

.seo-h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 18px;
  letter-spacing: -0.01em;
}

/* Materials */
.mat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  list-style: none;
}

@media (min-width: 600px) {
  .mat-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 900px) {
  .mat-grid { grid-template-columns: repeat(6, 1fr); }
}

.mat-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 12px;
}

.mat-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1;
}

.mat-item strong {
  display: block;
  font-size: 13px;
  color: #1E293B;
  margin-bottom: 2px;
}

.mat-desc {
  font-size: 11px;
  color: #94A3B8;
  display: block;
  line-height: 1.4;
}

/* Steps */
.steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  list-style: none;
  counter-reset: none;
}

@media (min-width: 700px) {
  .steps { flex-direction: row; gap: 20px; }
}

.step {
  display: flex;
  gap: 14px;
  flex: 1;
  background: #F8FAFC;
  border-radius: 14px;
  padding: 16px;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563EB;
  color: white;
  font-size: 15px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step strong {
  display: block;
  font-size: 14px;
  color: #1E293B;
  margin-bottom: 4px;
}

.step p {
  font-size: 13px;
  color: #64748B;
  line-height: 1.5;
}

/* FAQ */
.faq {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 860px;
}

.faq-item {
  border: 1.5px solid #F1F5F9;
  border-radius: 12px;
  overflow: hidden;
}

.faq-q {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
  text-align: left;
  transition: background 0.15s;
}

.faq-q:hover { background: #F8FAFC; }

.faq-chevron {
  font-size: 18px;
  color: #94A3B8;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.faq-chevron.open { transform: rotate(180deg); }

.faq-a {
  padding: 0 16px 14px;
  font-size: 13px;
  color: #475569;
  line-height: 1.65;
  border-top: 1px solid #F1F5F9;
  padding-top: 12px;
}
</style>
