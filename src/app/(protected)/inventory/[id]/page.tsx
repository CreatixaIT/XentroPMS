'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, History, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InventoryItem, InventoryTransaction, InventoryPurchase } from '@/lib/inventory/types'

export default function InventoryItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'transactions' | 'purchases'>('transactions')

  const loadItem = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventory/items/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setItem(data.item)
      }
    } catch (error) {
      console.error('Error loading item:', error)
    }
  }, [params.id])

  const loadTransactions = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventory/items/${params.id}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }, [params.id])

  const loadPurchases = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventory/items/${params.id}/purchases`)
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases)
      }
    } catch (error) {
      console.error('Error loading purchases:', error)
    }
  }, [params.id])

  useEffect(() => {
    ;(async () => {
      await loadItem()
      await loadTransactions()
      await loadPurchases()
      setLoading(false)
    })()
  }, [loadItem, loadTransactions, loadPurchases])

  const getStockStatusBadge = (item: InventoryItem) => {
    const status = item.current_quantity === 0
      ? 'OUT_OF_STOCK'
      : item.current_quantity <= item.reorder_level
      ? 'LOW_STOCK'
      : 'IN_STOCK'

    const styles = {
      IN_STOCK: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={styles[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading item details...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Item not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground">SKU: {item.sku}</p>
        </div>
      </div>

      {/* Item Details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.current_quantity} {item.unit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reorder Level</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.reorder_level} {item.unit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Cost</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{item.unit_cost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Status</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {getStockStatusBadge(item)}
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Item Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Category</div>
              <div className="font-medium">{item.category?.name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Unit</div>
              <div className="font-medium">{item.unit}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Size/Specification</div>
              <div className="font-medium">{item.size_specification || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Selling Price</div>
              <div className="font-medium">{item.selling_price ? `৳${item.selling_price.toFixed(2)}` : '-'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="font-medium">{item.description || '-'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'transactions' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('transactions')}
        >
          <History className="h-4 w-4 mr-2" />
          Transaction History
        </Button>
        <Button
          variant={activeTab === 'purchases' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('purchases')}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          Purchase History
        </Button>
      </div>

      {/* Transaction History */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity Change</TableHead>
                    <TableHead className="text-right">Before</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.transaction_type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.transaction_type === 'ADJUSTMENT_OUT' ? '-' : '+'}{tx.quantity}
                        </TableCell>
                        <TableCell className="text-right">{tx.quantity_before}</TableCell>
                        <TableCell className="text-right">{tx.quantity_after}</TableCell>
                        <TableCell>{tx.reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase History */}
      {activeTab === 'purchases' && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No purchases found
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {new Date(purchase.purchase_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>{purchase.quantity}</TableCell>
                        <TableCell className="text-right">৳{purchase.unit_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">৳{purchase.total_cost.toFixed(2)}</TableCell>
                        <TableCell>{purchase.supplier_name || '-'}</TableCell>
                        <TableCell>{purchase.invoice_reference || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
