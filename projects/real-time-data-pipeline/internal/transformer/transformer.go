package transformer

import "encoding/json"

// Event represents a validated, schema-versioned event from Kafka.
type Event struct {
	EventID  string          `json:"event_id"`
	TenantID string          `json:"tenant_id"`
	Schema   string          `json:"schema"`
	Version  int             `json:"version"`
	Payload  json.RawMessage `json:"payload"`
}

// TransformResult is the output of applying tenant transformation rules.
type TransformResult struct {
	Original    Event
	Transformed json.RawMessage
	Sinks       []string // e.g. ["clickhouse", "alerting", "billing"]
}

// Transformer applies per-tenant transformation rules to events.
type Transformer struct {
	rules map[string][]Rule
}

// Rule is a simple predicate+mutation applied to an event payload.
type Rule struct {
	Field  string
	Action string // "enrich" | "mask" | "route"
	Value  string
}

// NewTransformer creates a Transformer loaded with tenant rules.
func NewTransformer(rules map[string][]Rule) *Transformer {
	return &Transformer{rules: rules}
}

// Transform applies tenant-specific rules and determines routing sinks.
func (t *Transformer) Transform(evt Event) TransformResult {
	sinks := []string{"clickhouse"}

	// Apply routing rules from config
	for _, rule := range t.rules[evt.TenantID] {
		switch rule.Action {
		case "route":
			sinks = append(sinks, rule.Value)
		}
	}

	return TransformResult{
		Original:    evt,
		Transformed: evt.Payload,
		Sinks:       sinks,
	}
}
