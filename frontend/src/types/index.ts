export type Money = string

export interface DeviceModel {
  id: number
  name: string
  short_name: string
  slug: string
  family?: string
}

export interface CollectionSummary {
  name: string
  slug: string
  tagline?: string | null
  description?: string | null
  image?: string | null
  count?: number
}

export interface ImageRef {
  url: string
  alt: string
}

export interface ProductCard {
  id: number
  name: string
  slug: string
  type: 'case' | 'power_bank' | 'bundle'
  collection: { name: string; slug: string } | null
  short_description: string | null
  material: string | null
  price: Money
  price_max: Money
  compare_at_price: Money | null
  image: ImageRef | null
  hover_image: ImageRef | null
  colors: { name: string; hex: string; in_stock: boolean; image: string | null }[]
  models: string[]
  labels: string[]
  in_stock: boolean
  is_customizable: boolean
  quick_add_variant_id: number | null
  variant_count: number
}

export interface BundleComponent {
  variant_id: number
  name: string
  slug: string
  label: string
  price: Money
  quantity: number
  image: string | null
}

export interface Variant {
  id: number
  sku: string
  device_model_id: number | null
  device_model: string | null
  color_name: string
  color_hex: string
  price: Money
  compare_at_price: Money | null
  stock: number
  in_stock: boolean
  low_stock: boolean
  components: BundleComponent[] | null
}

export interface MediaItem {
  id: number
  type: 'image' | 'video'
  url: string
  alt: string
  color_name: string | null
  width: number | null
  height: number | null
}

export interface ProductDetail extends ProductCard {
  description: string | null
  care_instructions: string | null
  specs: Record<string, string>
  video_url: string | null
  is_handmade: boolean
  is_limited_edition: boolean
  production_days: { min: number; max: number | null } | null
  collections: { name: string; slug: string }[]
  media: MediaItem[]
  variants: Variant[]
  device_models: DeviceModel[]
  seo: { title: string; description: string | null }
  matching: ProductCard[]
  related: ProductCard[]
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page?: number; total: number }
}

export interface Facets {
  colors: { name: string; hex: string }[]
  materials: string[]
  price: { min: number; max: number }
  types: { value: string; label: string }[]
}

export interface WhatsAppTemplate {
  key: string
  label: string
  message: string
}

export interface StoreSettings {
  demo_mode: boolean
  currency: string
  store: { name?: string; tagline?: string; description?: string; contact_email?: string | null; business_info?: string; demo_badge?: string }
  announcement: { enabled: boolean; text?: string; link_label?: string; link_url?: string }
  whatsapp: { enabled: boolean; number: string | null; default_message: string; templates: WhatsAppTemplate[] }
  shipping: { free_threshold: number | null; countries: string[]; areas: string[]; delivery_note?: string | null }
  social: Record<string, string>
  pages: { slug: string; title: string }[]
  device_models: DeviceModel[]
  collections: CollectionSummary[]
}

export interface HomeContent {
  hero: {
    eyebrow?: string
    title: string
    description?: string
    primary_label?: string
    primary_url?: string
    secondary_label?: string
    secondary_url?: string
    image_desktop?: string
    image_mobile?: string
  }
  sections: Record<string, boolean>
  handmade_story: { eyebrow?: string; title?: string; body?: string; note?: string; cta_label?: string; cta_url?: string; image?: string }
  complete_the_look: { eyebrow?: string; title?: string; description?: string; bundle: ProductDetail | null }
  collections: CollectionSummary[]
  bestsellers: ProductCard[]
  new_arrivals: ProductCard[]
  featured: ProductCard[]
  handmade: ProductCard[]
}

export interface Customization {
  text?: string
  colors?: string
  instructions?: string
}

export interface CartItem {
  key: string
  variant_id: number
  quantity: number
  customization?: Customization | null
}

export interface QuoteLine {
  key: number
  variant_id: number
  product?: { id: number; name: string; slug: string; type: string; is_handmade: boolean; image: string | null }
  sku?: string
  device_model?: string | null
  color_name?: string
  color_hex?: string
  unit_price?: Money
  compare_at_price?: Money | null
  quantity: number
  stock?: number
  available: boolean
  line_total: Money
  customization?: Customization | null
  components?: { variant_id: number; name: string; sku: string; label: string; quantity: number }[] | null
  issues: string[]
}

export interface ShippingOption {
  code: string
  name: string
  fee: Money
  estimate: string
  is_free: boolean
}

export interface Quote {
  lines: QuoteLine[]
  count: number
  subtotal: Money
  shipping_options: ShippingOption[]
  shipping_method: string | null
  shipping_total: Money
  total: Money
  free_shipping_threshold: number | null
  currency: string
  shortage_variant_ids: number[]
  can_checkout: boolean
}
