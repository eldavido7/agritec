import 'package:flutter/material.dart';

typedef CategoryVisual = ({IconData icon, Color bgColor, Color iconColor});

CategoryVisual categoryVisualForSlug(String slug) {
  switch (slug) {
    case 'vegetables':
      return (
        icon: Icons.eco_outlined,
        bgColor: const Color(0xFFE1F5EE),
        iconColor: const Color(0xFF0F6E56),
      );
    case 'fruits':
      return (
        icon: Icons.apple_outlined,
        bgColor: const Color(0xFFFFEFE8),
        iconColor: const Color(0xFFB24A2A),
      );
    case 'grains-cereals':
      return (
        icon: Icons.grass_rounded,
        bgColor: const Color(0xFFEAF3DE),
        iconColor: const Color(0xFF3B6D11),
      );
    case 'tubers-roots':
      return (
        icon: Icons.spa_outlined,
        bgColor: const Color(0xFFF9EFDF),
        iconColor: const Color(0xFF8A5C16),
      );
    case 'legumes':
      return (
        icon: Icons.grain_outlined,
        bgColor: const Color(0xFFECE8F8),
        iconColor: const Color(0xFF514087),
      );
    case 'spices-herbs':
      return (
        icon: Icons.local_florist_outlined,
        bgColor: const Color(0xFFE9F3E2),
        iconColor: const Color(0xFF3C6F1D),
      );
    case 'livestock':
      return (
        icon: Icons.pets_outlined,
        bgColor: const Color(0xFFF3ECE8),
        iconColor: const Color(0xFF6D4F3D),
      );
    case 'poultry':
      return (
        icon: Icons.egg_outlined,
        bgColor: const Color(0xFFFAECE7),
        iconColor: const Color(0xFF993C1D),
      );
    case 'fish-seafood':
      return (
        icon: Icons.set_meal_outlined,
        bgColor: const Color(0xFFE4F0FB),
        iconColor: const Color(0xFF255B8A),
      );
    case 'dairy':
      return (
        icon: Icons.water_drop_outlined,
        bgColor: const Color(0xFFFAEEDA),
        iconColor: const Color(0xFF854F0B),
      );
    case 'seeds-seedlings':
      return (
        icon: Icons.yard_outlined,
        bgColor: const Color(0xFFE5F4EA),
        iconColor: const Color(0xFF2C6E47),
      );
    case 'farm-inputs':
      return (
        icon: Icons.agriculture_outlined,
        bgColor: const Color(0xFFE9ECEF),
        iconColor: const Color(0xFF44515B),
      );
    case 'processed-farm-products':
      return (
        icon: Icons.inventory_2_outlined,
        bgColor: const Color(0xFFF2EAE6),
        iconColor: const Color(0xFF7A4C35),
      );
    case 'other':
      return (
        icon: Icons.category_outlined,
        bgColor: const Color(0xFFE8EEF0),
        iconColor: const Color(0xFF46606A),
      );
    default:
      return (
        icon: Icons.sell_outlined,
        bgColor: const Color(0xFFEFF2F1),
        iconColor: const Color(0xFF4E5E57),
      );
  }
}
