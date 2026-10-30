<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every stock change goes through here so it is row-locked, never negative,
 * and recorded in inventory_movements.
 */
class InventoryService
{
    public function adjust(ProductVariant $variant, int $change, string $reason, ?string $reference = null, ?string $note = null, ?int $userId = null): ProductVariant
    {
        return DB::transaction(function () use ($variant, $change, $reason, $reference, $note, $userId) {
            /** @var ProductVariant $locked */
            $locked = ProductVariant::whereKey($variant->id)->lockForUpdate()->firstOrFail();
            $newStock = $locked->stock + $change;
            if ($newStock < 0) {
                throw ValidationException::withMessages([
                    'stock' => "Insufficient stock for {$locked->sku} (available {$locked->stock}).",
                ]);
            }
            $locked->stock = $newStock;
            $locked->save();

            InventoryMovement::create([
                'product_variant_id' => $locked->id,
                'change' => $change,
                'stock_after' => $newStock,
                'reason' => $reason,
                'reference' => $reference,
                'note' => $note,
                'user_id' => $userId,
            ]);

            return $locked;
        });
    }

    public function setStock(ProductVariant $variant, int $stock, ?string $note = null, ?int $userId = null): ProductVariant
    {
        return DB::transaction(function () use ($variant, $stock, $note, $userId) {
            $current = ProductVariant::whereKey($variant->id)->lockForUpdate()->value('stock');

            return $stock === $current
                ? $variant->refresh()
                : $this->adjust($variant, $stock - $current, 'adjustment', null, $note, $userId);
        });
    }

    /**
     * Expand a sellable variant into the physical variants whose stock moves.
     *
     * @return array<int, int> variant id => units
     */
    public function physicalUnits(ProductVariant $variant, int $quantity): array
    {
        if (! $variant->isBundle()) {
            return [$variant->id => $quantity];
        }

        $units = [];
        foreach ($variant->components as $component) {
            $units[$component->id] = ($units[$component->id] ?? 0) + $component->pivot->quantity * $quantity;
        }

        return $units;
    }
}
