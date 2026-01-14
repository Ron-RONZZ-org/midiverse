import en from './i18n/locales/en.json'
import fr from './i18n/locales/fr.json'
import eo from './i18n/locales/eo.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    en,
    fr,
    eo
  }
}))
