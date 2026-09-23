import addressData from '~/assets/data/japan-address.json'

// 都道府県 → 市区町村一覧（総務省の郵便番号データより生成）
const data = addressData as Record<string, string[]>

export const useJapanAddress = () => {
  const prefectures = Object.keys(data)
  const citiesOf = (prefecture: string): string[] => data[prefecture] ?? []
  return { prefectures, citiesOf }
}
