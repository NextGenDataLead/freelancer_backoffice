/**
 * ConnectionLines Component
 * Renders SVG connection lines for the organogram structure
 */

import React from 'react'
import { OrganogramNodeData } from './OrganogramNode'

interface ConnectionLinesProps {
  rootNode: OrganogramNodeData
  expandedNodes: Set<string>
  className?: string
}

interface ConnectionPoint {
  x: number
  y: number
  nodeId: string
  level: number
}

export function ConnectionLines({
  rootNode,
  expandedNodes,
  className = ''
}: ConnectionLinesProps) {
  // Calculate connection points for all visible nodes
  const calculateConnectionPoints = (node: OrganogramNodeData, startX: number = 0, startY: number = 0, level: number = 0): ConnectionPoint[] => {
    const points: ConnectionPoint[] = []

    // Add current node
    points.push({
      x: startX,
      y: startY,
      nodeId: node.id,
      level
    })

    // If node is expanded and has children, calculate their positions
    if (expandedNodes.has(node.id) && node.children && node.children.length > 0) {
      const childrenCount = node.children.length
      const childSpacing = 200 // Base spacing between children
      const totalWidth = (childrenCount - 1) * childSpacing
      const startChildX = startX - totalWidth / 2

      node.children.forEach((child, index) => {
        const childX = startChildX + index * childSpacing
        const childY = startY + 150 // Vertical spacing between levels

        const childPoints = calculateConnectionPoints(child, childX, childY, level + 1)
        points.push(...childPoints)
      })
    }

    return points
  }

  // Generate SVG path for connections
  const generateConnections = (points: ConnectionPoint[]) => {
    const connections: React.ReactElement[] = []
    let connectionId = 0

    const rootPoint = points.find(p => p.nodeId === rootNode.id)
    if (!rootPoint) return connections

    const addConnectionsForNode = (node: OrganogramNodeData, parentPoint: ConnectionPoint) => {
      if (!expandedNodes.has(node.id) || !node.children || node.children.length === 0) return

      node.children.forEach((child) => {
        const childPoint = points.find(p => p.nodeId === child.id)
        if (!childPoint) return

        // Generate curved connection line
        const midY = parentPoint.y + (childPoint.y - parentPoint.y) / 2
        const path = `M ${parentPoint.x} ${parentPoint.y + 60}
                     L ${parentPoint.x} ${midY}
                     L ${childPoint.x} ${midY}
                     L ${childPoint.x} ${childPoint.y - 60}`

        connections.push(
          <path
            key={`connection-${connectionId++}`}
            d={path}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-border animate-in slide-in-from-top duration-300"
            strokeDasharray="4 4"
          />
        )

        // Recursively add connections for child nodes
        addConnectionsForNode(child, childPoint)
      })
    }

    addConnectionsForNode(rootNode, rootPoint)
    return connections
  }

  const connectionPoints = calculateConnectionPoints(rootNode)
  const connections = generateConnections(connectionPoints)

  // Calculate SVG viewBox based on connection points
  const calculateViewBox = (points: ConnectionPoint[]) => {
    if (points.length === 0) return "0 0 800 600"

    const minX = Math.min(...points.map(p => p.x)) - 150
    const maxX = Math.max(...points.map(p => p.x)) + 150
    const minY = Math.min(...points.map(p => p.y)) - 100
    const maxY = Math.max(...points.map(p => p.y)) + 100

    const width = maxX - minX
    const height = maxY - minY

    return `${minX} ${minY} ${width} ${height}`
  }

  if (connections.length === 0) {
    return null
  }

  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox={calculateViewBox(connectionPoints)}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Connection Lines */}
      <g className="opacity-60">
        {connections}
      </g>

      {/* Connection Points (optional decorative circles) */}
      <g className="opacity-30">
        {connectionPoints.slice(1).map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="currentColor"
            className="text-primary"
          />
        ))}
      </g>
    </svg>
  )
}