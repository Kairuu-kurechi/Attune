import networkx as nx
import json
import re
from typing import List, Dict


class CausalGraph:
    def __init__(self):
        # We use a Directed Graph (DiGraph) because prerequisites flow in one direction
        self.graph = nx.DiGraph()

    def extract_json(self, raw_text: str) -> List[Dict]:
        """
        LLMs sometimes wrap JSON in markdown blocks (```json ... ```).
        This cleans the response so we can parse it safely.
        """
        try:
            # Find the JSON array using regex
            match = re.search(r"\[.*\]", raw_text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return []
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from: {raw_text}")
            return []

    def add_relationships(self, raw_llm_response: str):
        """
        Takes the LLM's raw text, extracts the JSON, and adds nodes/edges.
        """
        relationships = self.extract_json(raw_llm_response)

        for rel in relationships:
            source = rel.get("source", "").strip().lower()
            target = rel.get("target", "").strip().lower()
            relation = rel.get("relationship", "").strip()

            if source and target:
                # Add edge. If nodes don't exist, networkx creates them automatically.
                self.graph.add_edge(source, target, relation=relation)

    def get_prerequisites(self, concept: str) -> List[str]:
        """
        Returns the concepts that the given concept depends on.
        """
        concept = concept.lower().strip()
        if concept in self.graph:
            return list(self.graph.predecessors(concept))
        return []

    def print_graph(self):
        """
        Prints the current state of the graph to the terminal.
        """
        print("\n--- CURRENT KNOWLEDGE GRAPH ---")
        if self.graph.number_of_edges() == 0:
            print("Graph is empty.")
        else:
            for u, v, data in self.graph.edges(data=True):
                print(f"[{u}] --({data['relation']})--> [{v}]")
        print("-------------------------------\n")
