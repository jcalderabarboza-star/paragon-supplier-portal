import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockInventory } from '../../data/mockInventory';
import { mockTrendData, mockKpisByCategory } from '../../data/mockKpis';
import { POStatus, ChannelType } from '../../types/purchaseOrder.types';
import { StockStatus, ScorecardGrade } from '../../types/supplier.types';

const NAVY    = '#0D1B2A';
const NAVY2   = '#152236';
const TEAL    = '#0097A7';
const MID     = '#354A5F';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0A6ED1';
