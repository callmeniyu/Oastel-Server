export type CartItemType = {
    _id: string
    packageId: string
    packagename: string
    image: string
    price: number
    quantity: number
    totalPrice: number
}

export type BookingType = {
    _id: string
    packageId: string
    packagename: string
    image: string
    price: number
    quantity: number
    totalPrice: number
    bookingDate: Date
    status: "pending" | "confirmed" | "cancelled"
}

export type UserType = {
    _id: string
    userdata: {
        name: string
        email: string
        image?: string
        password?: string
        location?: string
        bio?: string
        address?: {
            whatsapp?: string
            phone?: string
            pickupAddress?: string[]
        }
    },
}
