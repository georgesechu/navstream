"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AlertEvent, SensorEvent } from "@/lib/sensor-simulator";

export interface LiveSensorValue {
  sensorId: string;
  equipmentId: string;
  siteId: string;
  value: number;
  unit: string;
  sensorName: string;
  timestamp: string;
}

export interface LiveAlert {
  id: string;
  siteId: string;
  equipmentId: string;
  sensorId: string;
  title: string;
  description: string;
  severity: "critical" | "warning";
  createdAt: string;
}

interface UseLiveSensorsResult {
  /** Map of sensorId -> latest value */
  sensorValues: Map<string, LiveSensorValue>;
  /** Recent alerts received via SSE (newest first, max 50) */
  alerts: LiveAlert[];
  /** Whether the EventSource is currently connected */
  isConnected: boolean;
}

const MAX_ALERTS = 50;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/**
 * Hook that connects to the live sensor SSE endpoint.
 * Maintains a map of latest sensor values and a list of recent alerts.
 * Reconnects automatically on disconnect with exponential backoff.
 */
export function useLiveSensors(siteId?: string): UseLiveSensorsResult {
  const [sensorValues, setSensorValues] = useState<Map<string, LiveSensorValue>>(
    () => new Map()
  );
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const url = siteId
      ? `/api/sensors/live?siteId=${encodeURIComponent(siteId)}`
      : "/api/sensors/live";

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
    });

    // Default "message" event carries sensor data
    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data) as SensorEvent;
        setSensorValues((prev) => {
          const next = new Map(prev);
          next.set(data.sensorId, {
            sensorId: data.sensorId,
            equipmentId: data.equipmentId,
            siteId: data.siteId,
            value: data.value,
            unit: data.unit,
            sensorName: data.sensorName,
            timestamp: data.timestamp,
          });
          return next;
        });
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    };

    es.addEventListener("alert", (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse((event as MessageEvent).data) as AlertEvent;
        const liveAlert: LiveAlert = {
          id: data.id,
          siteId: data.siteId,
          equipmentId: data.equipmentId,
          sensorId: data.sensorId,
          title: data.title,
          description: data.description,
          severity: data.severity,
          createdAt: data.createdAt,
        };
        setAlerts((prev) => [liveAlert, ...prev].slice(0, MAX_ALERTS));
      } catch {
        // Ignore parse errors
      }
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff reconnect
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt), RECONNECT_MAX_MS);
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
    };
  }, [siteId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return { sensorValues, alerts, isConnected };
}
