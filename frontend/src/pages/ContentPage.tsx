import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { Breadcrumbs, Seo, Skeleton } from '../components/ui'
import { api } from '../services/api'

export default function ContentPage() {
  const { slug } = useParams()
  const { data, isLoading, error } = useQuery({ queryKey: ['page', slug], queryFn: () => api<{ title: string; body: string }>(`/pages/${slug}`), retry: false })

  if (error) return <NotFound />
  return (
    <div className="container-lux py-10 md:py-16">
      <Seo title={data?.title ?? 'NOIRÉ'} />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: data?.title ?? '…' }]} />
      <article className="mx-auto mt-10 max-w-2xl">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <h1 className="heading-section mb-8">{data?.title}</h1>
            {data?.body.split('\n').filter(Boolean).map((p, i) => (
              <p key={i} className="mb-5 text-[16px] leading-relaxed text-ink/80">
                {p}
              </p>
            ))}
          </>
        )}
      </article>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="container-lux py-32 text-center">
      <Seo title="Page not found" />
      <p className="eyebrow text-muted">404</p>
      <h1 className="heading-section mt-4">This page doesn’t exist</h1>
      <Link to="/" className="btn btn-primary mt-8">
        Return home
      </Link>
    </div>
  )
}
