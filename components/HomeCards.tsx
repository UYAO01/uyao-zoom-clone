import React from 'react'
import Image from 'next/image'
import { cn } from '@/src/lib/utils'


// import { cn } from '@/lib/utils' // Uncomment and update path as needed

interface HomeCardProps {
  className: string
  Img: string
  title: string
  description: string
  handleClick: () => void
}

const HomeCards = ({ className, Img, title, description, handleClick }: HomeCardProps) => {
  return (
    <div
      className={cn(
        'px-4 py-6 flex-col justify-between w-full xl:max-w-[270px] min-h-[260px] rounded-[14px] cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      <div className='flex-center glassmorphism size-12 rounded-[10px]'>
        <Image src={Img} alt={`${title} Icon`} width={27} height={27} />
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='text-2xl font-bold'>{title}</h2>
        <p className='text-lg font-normal'>{description}</p>
      </div>
    </div>
  )
}

export default HomeCards
